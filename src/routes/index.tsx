import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";

// Define data types for clarity
type Data = {
  title: string;
  section: Section[];
};

type Section = {
  title: string;
  seconds: number;
  presenter: string[]; // Keeping this though not currently used in UI
};

const MIN = 60; // Constant for seconds in a minute

// Initial Program data now defined as a constant
const DEFAULT_PROGRAM_DATA: Data = {
  title: "Smart countdown",
  section: [
    {
      title: "Diskuter hvem som har størst zebb",
      seconds: 2 * MIN, // 2 minutes
      presenter: [],
    },
    {
      title: "Diskuter mulige løsninger",
      seconds: 2 * MIN, // 2 minutes
      presenter: [],
    },
    {
      title: "Lag en plan",
      seconds: 2 * MIN, // 2 minutes
      presenter: [],
    },
  ],
};

// Route definition for @tanstack/react-router
export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [programData, setProgramData] = useState<Data>(DEFAULT_PROGRAM_DATA);
  const [actualStartTime, setActualStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [totalPauseDuration, setTotalPauseDuration] = useState<number>(0);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeBasedActiveIndex, setTimeBasedActiveIndex] = useState(0);
  // Removed hoveredSectionIndex state as it's no longer needed for button visibility
  // const [hoveredSectionIndex, setHoveredSectionIndex] = useState<number | null>(null);


  const [showAddSection, setShowAddSection] = useState<boolean>(false);
  const [newSectionTitle, setNewSectionTitle] = useState<string>('');
  const [newSectionDuration, setNewSectionDuration] = useState<number>(5);

  const displayIndex = timeBasedActiveIndex;

  const totalProgramDurationSeconds = programData.section.reduce((acc, section) => acc + section.seconds, 0);

  useEffect(() => {
    if (!actualStartTime) {
      // If program hasn't started, still update current time to show accurate section times
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }

    const timer = setInterval(() => {
      if (!isPaused) {
        const now = new Date();
        setCurrentTime(now);

        const elapsedSinceRefStart = now.getTime() - actualStartTime.getTime() - totalPauseDuration;
        const totalElapsedSecondsSinceStart = Math.floor(elapsedSinceRefStart / 1000);

        let newTimeBasedActiveIndex = 0;
        let accumulatedSeconds = 0;

        if (totalElapsedSecondsSinceStart < 0) {
          newTimeBasedActiveIndex = 0;
        } else {
          let foundSection = false;
          for (let i = 0; i < programData.section.length; i++) {
            const section = programData.section[i];
            if (totalElapsedSecondsSinceStart >= accumulatedSeconds && totalElapsedSecondsSinceStart < accumulatedSeconds + section.seconds) {
              newTimeBasedActiveIndex = i;
              foundSection = true;
              break;
            }
            accumulatedSeconds += section.seconds;
          }
          if (!foundSection) {
            newTimeBasedActiveIndex = programData.section.length - 1;
          }
        }
        setTimeBasedActiveIndex(newTimeBasedActiveIndex);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, actualStartTime, programData, totalPauseDuration]);

  useEffect(() => {
    if (actualStartTime) {
      const calculatedEndTime = new Date(actualStartTime.getTime() + totalProgramDurationSeconds * 1000 + totalPauseDuration);
      setEndTime(calculatedEndTime);
    } else {
      setEndTime(null);
    }
  }, [actualStartTime, programData, totalPauseDuration, totalProgramDurationSeconds]);

  let currentSection = programData.section[displayIndex];
  let secondsIntoCurrentSection = 0;
  let progressPercentage = 0;

  let totalElapsedSecondsConsideringPause = 0;

  if (actualStartTime) {
    totalElapsedSecondsConsideringPause = Math.floor((currentTime.getTime() - actualStartTime.getTime() - totalPauseDuration) / 1000);
  }

  let accumulatedSecondsForDisplayIndex = 0;
  for (let i = 0; i < displayIndex; i++) {
    accumulatedSecondsForDisplayIndex += programData.section[i].seconds;
  }

  secondsIntoCurrentSection = Math.max(0, totalElapsedSecondsConsideringPause - accumulatedSecondsForDisplayIndex);
  
  if (currentSection) { 
    secondsIntoCurrentSection = Math.min(secondsIntoCurrentSection, currentSection.seconds);
    progressPercentage = (secondsIntoCurrentSection / currentSection.seconds) * 100;
  } else {
    progressPercentage = 0;
  }
  
  progressPercentage = Math.max(0, Math.min(100, progressPercentage));

  const displaySectionProgress = progressPercentage;

  const handleStartProgram = () => {
    if (!actualStartTime) {
      const now = new Date();
      setActualStartTime(now);
      setCurrentTime(now);
      setTotalPauseDuration(0);
      setIsPaused(false);
      setPausedAt(null);
    }
  };

  const handlePauseToggle = () => {
    if (!actualStartTime) return; // Only allow pause/resume if program has started

    if (isPaused) {
      if (pausedAt) {
        const duration = currentTime.getTime() - pausedAt.getTime();
        setTotalPauseDuration(prev => prev + duration);
      }
      setPausedAt(null);
    } else {
      setPausedAt(currentTime);
    }
    setIsPaused(!isPaused);
  };

  const handleRestartProgram = () => {
    setProgramData(DEFAULT_PROGRAM_DATA); // Reset to default program data
    setActualStartTime(null);
    setEndTime(null);
    setIsPaused(false);
    setPausedAt(null);
    setTotalPauseDuration(0);
    setCurrentTime(new Date());
    setTimeBasedActiveIndex(0);
    setShowAddSection(false);
    setNewSectionTitle('');
    setNewSectionDuration(5);
  };

  const handleMinuteAdjustment = (index: number, change: number) => {
    setProgramData(prevData => {
      const newSections = [...prevData.section];
      const sectionToAdjust = newSections[index];

      const newSectionToAdjustSeconds = Math.max(0, sectionToAdjust.seconds + change * 60);
      const actualChangeInSeconds = newSectionToAdjustSeconds - sectionToAdjust.seconds;

      newSections[index] = {
        ...sectionToAdjust,
        seconds: newSectionToAdjustSeconds,
      };

      const sectionsToDistributeTo = newSections.slice(index + 1);
      const numberOfSectionsToDistributeTo = sectionsToDistributeTo.length;

      if (numberOfSectionsToDistributeTo > 0) {
        const totalDurationOfRemainingSections = sectionsToDistributeTo.reduce((acc, sec) => acc + sec.seconds, 0);
        const timeToDistribute = -actualChangeInSeconds;

        if (totalDurationOfRemainingSections === 0 && timeToDistribute < 0) {
            return { ...prevData, section: newSections };
        }

        let distributedSeconds = 0;
        for (let i = 0; i < numberOfSectionsToDistributeTo; i++) {
          const remainingSectionIndex = index + 1 + i;
          const originalRemainingSection = newSections[remainingSectionIndex];

          const proportion = totalDurationOfRemainingSections > 0 ? (originalRemainingSection.seconds / totalDurationOfRemainingSections) : (1 / numberOfSectionsToDistributeTo);
          
          let changeForThisSection = Math.round(timeToDistribute * proportion);

          let newRemainingSectionSeconds = Math.max(0, originalRemainingSection.seconds + changeForThisSection);

          if (newRemainingSectionSeconds === 0 && originalRemainingSection.seconds + changeForThisSection > 0) {
              newRemainingSectionSeconds = 0;
          }
          
          distributedSeconds += (newRemainingSectionSeconds - originalRemainingSection.seconds);

          newSections[remainingSectionIndex] = {
            ...originalRemainingSection,
            seconds: newRemainingSectionSeconds,
          };
        }

        const finalAdjustment = timeToDistribute - distributedSeconds;
        if (finalAdjustment !== 0 && newSections.length > index + 1) {
            const lastAffectedIndex = newSections.length - 1;
            newSections[lastAffectedIndex] = {
                ...newSections[lastAffectedIndex],
                seconds: Math.max(0, newSections[lastAffectedIndex].seconds + finalAdjustment)
            };
        }
      }

      return { ...prevData, section: newSections };
    });
  };

  const handleDeleteSection = (indexToDelete: number) => {
    if (programData.section.length === 1) {
      alert("Cannot delete the last section of the program.");
      return;
    }

    setProgramData(prevData => {
      const newSections = prevData.section.filter((_, i) => i !== indexToDelete);
      return { ...prevData, section: newSections };
    });
    // Adjust active index if the deleted section was before the current active one
    if (indexToDelete < timeBasedActiveIndex && timeBasedActiveIndex > 0) {
      setTimeBasedActiveIndex(prev => prev - 1);
    } else if (indexToDelete === timeBasedActiveIndex && timeBasedActiveIndex === programData.section.length - 1) {
      // If the last active section is deleted, move active to previous
      setTimeBasedActiveIndex(prev => prev - 1);
    }
  };

  const handleAddSection = () => {
    if (newSectionTitle.trim() === '' || newSectionDuration <= 0) {
      alert('Please enter a valid title and duration for the new section.');
      return;
    }

    const newSection: Section = {
      title: newSectionTitle.trim(),
      seconds: newSectionDuration * 60,
      presenter: [],
    };

    setProgramData(prevData => ({
      ...prevData,
      section: [...prevData.section, newSection],
    }));

    setNewSectionTitle('');
    setNewSectionDuration(5);
    setShowAddSection(false);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black w-full font-inter">
      {/* Header for Pause, Restart, and Add Section - Always visible */}
      <div className="fixed top-0 left-0 w-full bg-gray-900 bg-opacity-75 z-40 py-4 px-8 flex justify-between items-center shadow-lg">
        <div className="flex gap-4"> {/* Grouping Start/Pause and Restart */}
            {!actualStartTime ? (
            <button
                onClick={handleStartProgram}
                className="py-2 px-4 rounded-lg text-white font-semibold transition-colors duration-300 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-play-circle-fill" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M6.79 5.093A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814z"/>
                </svg> Start Program
            </button>
            ) : (
            <>
                <button
                    onClick={handlePauseToggle}
                    className={`py-2 px-4 rounded-lg text-white font-semibold transition-colors duration-300 flex items-center justify-center gap-2 ${
                    isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                >
                    {isPaused ? (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-play-fill" viewBox="0 0 16 16">
                        <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
                        </svg> Resume
                    </>
                    ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pause-fill" viewBox="0 0 16 16">
                        <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/>
                        </svg> Pause
                    </>
                    )}
                </button>
                <button
                    onClick={handleRestartProgram}
                    className="py-2 px-4 rounded-lg text-white font-semibold transition-colors duration-300 bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-counterclockwise" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.918.5.5 0 1 0-.908-.417A6 6 0 1 0 8 2z"/>
                        <path d="M8 4.464a.5.5 0 0 1 .707 0l1.414 1.414a.5.5 0 0 1-.707.707L8.5 5.707V10.5a.5.5 0 0 1-1 0V5.707L6.646 7.071a.5.5 0 1 1-.707-.707zm-2.403-1.63a.5.5 0 0 1-.167.575.5.5 0 0 0-.056.096l-.88.88a.5.5 0 1 0 .707.707l.88-.88A.5.5 0 0 1 6.597 2.834z"/>
                    </svg> Restart
                </button>
            </>
            )}
        </div>
        
        <button
          onClick={() => setShowAddSection(true)}
          className="py-2 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus-circle-fill" viewBox="0 0 16 16">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z"/>
          </svg> Add Section
        </button>
      </div>

      <div className="flex flex-col items-center justify-center w-full max-w-7xl p-8 mt-20"> {/* Added mt-20 to push content down */}

        {/* Section List */}
        <div className="flex flex-col items-center justify-center gap-4 w-full col-span-8">
          {programData.section.map((section, i) => {
            let sectionCalculatedStartTime = new Date(currentTime.getTime()); // Start with current time
            let accumulatedDuration = 0;

            // If program has started, use actual start time for calculation
            if (actualStartTime) {
                accumulatedDuration = actualStartTime.getTime() + totalPauseDuration;
                for (let j = 0; j < i; j++) {
                    accumulatedDuration += programData.section[j].seconds * 1000;
                }
                sectionCalculatedStartTime = new Date(accumulatedDuration);
            } else { // If not started, calculate based on current time
                for (let j = 0; j < i; j++) {
                    accumulatedDuration += programData.section[j].seconds * 1000;
                }
                sectionCalculatedStartTime = new Date(currentTime.getTime() + accumulatedDuration);
            }

            const sectionDisplayTime = sectionCalculatedStartTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });

            return (
              <div
                key={i}
                // Use flex and justify-between on the parent div to push buttons to the right
                className={`flex items-center w-full gap-4`} 
                // Removed onMouseEnter and onMouseLeave handlers
                // onMouseEnter={() => setHoveredSectionIndex(i)}
                // onMouseLeave={() => setHoveredSectionIndex(null)}
              >
                <div // This is your "blue container" that holds the main section content
                    className={`relative flex items-center w-full
                    text-lg ${displayIndex === i && actualStartTime ? 'bg-blue-700 text-white shadow-md' : 'bg-gray-800 text-gray-300'} rounded-lg p-8 overflow-hidden transition-all duration-300 ease-in-out`}
                >
                    {/* Progress Bar Fill */}
                    <div
                        hidden={displayIndex !== i || !actualStartTime} // Only show progress bar if program has started and section is active
                        className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-500 ease-in-out"
                        style={{
                            width: `${displaySectionProgress}%`,
                            background: "#193cb8",
                        }}
                    />

                    <div className="flex items-center w-full gap-12 z-10">
                        <span className={`${displayIndex === i && actualStartTime ? 'text-blue-300' : 'text-gray-400 '}`}>
                            {i + 1}
                        </span>
                        <span className="font-semibold">
                            {sectionDisplayTime}
                        </span>
                        <span className="font-semibold">
                            {/* Convert seconds to HH:MM:SS format */}
                            {new Date(section.seconds * 1000).toISOString().substr(11, 8)}
                        </span>
                        <span className="font-semibold flex-grow">
                            {section.title}
                        </span>
                        { section.presenter.length > 0 && (
                            <span className={`${displayIndex === i && actualStartTime ? 'text-blue-300' : 'text-gray-400'}`}>
                                {section.presenter.join(", ")}
                            </span>
                        )}
                    </div>
                </div>

                {/* Plus/Minus and Delete Buttons - Always visible */}
                <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMinuteAdjustment(i, -0.5); // Subtract 30 seconds
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-4 transition-colors duration-300 mr-2"
                      title="Subtract 30 seconds"
                      disabled={section.seconds <= 30}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-dash" viewBox="0 0 16 16">
                        <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"/>
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMinuteAdjustment(i, 0.5);
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-4 transition-colors duration-300 mr-2"
                      title="Add 30 seconds"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus" viewBox="0 0 16 16">
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSection(i);
                      }}
                      className="bg-red-700 hover:bg-red-600 text-white rounded-full p-4 transition-colors duration-300"
                      title="Delete section"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash-fill" viewBox="0 0 16 16">
                        <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>
                      </svg>
                    </button>
                  </div>
              </div>
            );
          })}
        </div>

        {/* Add New Section Modal/Form */}
        {showAddSection && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-sm w-full">
              <h2 className="text-white text-xl font-semibold mb-6">Add New Section</h2>
              <div className="mb-4">
                <label htmlFor="newSectionTitle" className="block text-gray-300 text-sm font-bold mb-2">
                  Section Title:
                </label>
                <input
                  type="text"
                  id="newSectionTitle"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
                  placeholder="e.g., Q&A Session"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="newSectionDuration" className="block text-gray-300 text-sm font-bold mb-2">
                  Duration (minutes):
                </label>
                <input
                  type="number"
                  id="newSectionDuration"
                  value={newSectionDuration}
                  onChange={(e) => setNewSectionDuration(Math.max(1, Number(e.target.value)))} // Min 1 minute
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
                  min="1"
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowAddSection(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSection}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Add Section
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default Home;